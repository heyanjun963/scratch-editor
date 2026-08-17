import 'web-audio-test-api';

import React from 'react';
import configureStore from 'redux-mock-store';
import {act} from '@testing-library/react';
import {renderWithIntl} from '../../helpers/intl-helpers.jsx';
import {LoadingState} from '../../../src/reducers/project-state';
import VM from '@scratch/scratch-vm';

import SBFileUploaderHOC from '../../../src/lib/sb-file-uploader-hoc.jsx';
import {IntlProvider} from 'react-intl';

describe('SBFileUploaderHOC', () => {
    const mockStore = configureStore();
    let store;
    let vm;

    // Wrap this in a function so it gets test specific states and can be reused.
    const getContainer = function () {
        const Component = () => <div />;
        return SBFileUploaderHOC(Component);
    };

    const unwrappedInstance = () => {
        const WrappedComponent = getContainer();
        // default starting state: looking at a project you created, not logged in
        const wrapper = renderWithIntl(
            <WrappedComponent
                projectChanged
                canSave={false}
                cancelFileUpload={jest.fn()}
                closeFileMenu={jest.fn()}
                requestProjectUpload={jest.fn()}
                userOwnsProject={false}
                vm={vm}
                onLoadingFinished={jest.fn()}
                onLoadingStarted={jest.fn()}
                onUpdateProjectTitle={jest.fn()}
                store={store}
            />
        );
        return wrapper;
    };

    beforeEach(() => {
        vm = new VM();
        store = mockStore({
            scratchGui: {
                projectState: {
                    loadingState: LoadingState.SHOWING_WITHOUT_ID
                },
                vm: {}
            },
            locales: {
                locale: 'en'
            }
        });
    });

    test('if isLoadingUpload becomes true, without fileToUpload set, will call cancelFileUpload', () => {
        const mockedCancelFileUpload = jest.fn();
        const WrappedComponent = getContainer();
        const {rerender} = renderWithIntl(
            <WrappedComponent
                projectChanged
                canSave={false}
                cancelFileUpload={mockedCancelFileUpload}
                closeFileMenu={jest.fn()}
                isLoadingUpload={false}
                requestProjectUpload={jest.fn()}
                store={store}
                userOwnsProject={false}
                vm={vm}
                onLoadingFinished={jest.fn()}
                onLoadingStarted={jest.fn()}
                onUpdateProjectTitle={jest.fn()}
            />
        );
        rerender(
            <IntlProvider
                locale="en"
                messages={{ }}
            >
                <WrappedComponent
                    projectChanged
                    canSave={false}
                    cancelFileUpload={mockedCancelFileUpload}
                    closeFileMenu={jest.fn()}
                    isLoadingUpload
                    requestProjectUpload={jest.fn()}
                    store={store}
                    userOwnsProject={false}
                    vm={vm}
                    onLoadingFinished={jest.fn()}
                    onLoadingStarted={jest.fn()}
                    onUpdateProjectTitle={jest.fn()}
                />
            </IntlProvider>
        );
        expect(mockedCancelFileUpload).toHaveBeenCalled();
    });

    test('starts the existing project upload flow for a dropped Scratch project file', () => {
        let uploaderProps;
        const requestProjectUpload = jest.fn();
        const Component = props => {
            uploaderProps = props;
            return <div />;
        };
        const WrappedComponent = SBFileUploaderHOC(Component);
        renderWithIntl(
            <WrappedComponent
                canSave={false}
                cancelFileUpload={jest.fn()}
                isLoadingUpload={false}
                projectChanged={false}
                requestProjectUpload={requestProjectUpload}
                store={store}
                userOwnsProject={false}
                vm={vm}
                onLoadingFinished={jest.fn()}
                onLoadingStarted={jest.fn()}
                onSetProjectTitle={jest.fn()}
            />
        );

        act(() => {
            uploaderProps.onProjectFileUpload(new File(['project'], 'dropped.sb3'));
        });

        expect(requestProjectUpload).toHaveBeenCalledWith(LoadingState.SHOWING_WITHOUT_ID);
    });

    test('ignores a dropped file that is not a Scratch project', () => {
        let uploaderProps;
        const requestProjectUpload = jest.fn();
        const Component = props => {
            uploaderProps = props;
            return <div />;
        };
        const WrappedComponent = SBFileUploaderHOC(Component);
        renderWithIntl(
            <WrappedComponent
                canSave={false}
                cancelFileUpload={jest.fn()}
                isLoadingUpload={false}
                projectChanged={false}
                requestProjectUpload={requestProjectUpload}
                store={store}
                userOwnsProject={false}
                vm={vm}
                onLoadingFinished={jest.fn()}
                onLoadingStarted={jest.fn()}
                onSetProjectTitle={jest.fn()}
            />
        );

        act(() => {
            uploaderProps.onProjectFileUpload(new File(['text'], 'notes.txt'));
        });

        expect(requestProjectUpload).not.toHaveBeenCalled();
    });
});
